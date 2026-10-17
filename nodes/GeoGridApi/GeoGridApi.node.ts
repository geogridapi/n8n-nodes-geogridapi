import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { gridFields, gridOperations } from './descriptions/GridDescription';
import {
	accountOperations,
	batchFields,
	batchOperations,
	listingFields,
	listingOperations,
	scheduleFields,
	scheduleOperations,
} from './descriptions/OtherDescriptions';
import { apiBinaryRequest, apiRequest, simplifyGrid, waitUntilDone } from './transport';

const PAGE_SIZE = 100;

export class GeoGridApi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'GeoGridAPI',
		name: 'geoGridApi',
		icon: {
			light: 'file:../../icons/geogridapi.svg',
			dark: 'file:../../icons/geogridapi.dark.svg',
		},
		group: ['transform'],
		version: [1],
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Track Google Maps local rankings on a geo-grid with GeoGridAPI',
		defaults: { name: 'GeoGridAPI' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [{ name: 'geoGridApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Account', value: 'account' },
					{ name: 'Batch', value: 'batch' },
					{ name: 'Grid', value: 'grid' },
					{ name: 'Listing', value: 'listing' },
					{ name: 'Schedule', value: 'schedule' },
				],
				default: 'grid',
			},
			...gridOperations,
			...gridFields,
			...listingOperations,
			...listingFields,
			...batchOperations,
			...batchFields,
			...scheduleOperations,
			...scheduleFields,
			...accountOperations,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				const output = await runOperation.call(this, resource, operation, i);
				for (const entry of output) returnData.push({ ...entry, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				if (error instanceof NodeOperationError) {
					throw new NodeOperationError(this.getNode(), error, { itemIndex: i });
				}
				// HTTP errors: the API answers { error: { code, message } }, which NodeApiError reads.
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
			}
		}

		return [returnData];
	}
}

type Output = Array<Pick<INodeExecutionData, 'json' | 'binary'>>;

const one = (json: IDataObject): Output => [{ json }];
const many = (list: unknown): Output =>
	((list as IDataObject[] | undefined) ?? []).map((json) => ({ json }));

async function runOperation(
	this: IExecuteFunctions,
	resource: string,
	operation: string,
	i: number,
): Promise<Output> {
	if (resource === 'grid') return runGridOperation.call(this, operation, i);
	if (resource === 'listing' && operation === 'search') {
		const qs = {
			q: this.getNodeParameter('q', i) as string,
			language: this.getNodeParameter('language', i) as string,
		};
		return many((await apiRequest.call(this, 'GET', '/v1/places/search', { qs })).data);
	}
	if (resource === 'batch') return runBatchOperation.call(this, operation, i);
	if (resource === 'schedule') return runScheduleOperation.call(this, operation, i);
	if (resource === 'account' && operation === 'getBalance')
		return one(await apiRequest.call(this, 'GET', '/v1/balance'));
	throw new NodeOperationError(this.getNode(), `Unsupported operation: ${resource} ${operation}`, {
		itemIndex: i,
	});
}

/** Format of a grid (shape, size or density, options), shared by grids and batches. */
function formatBody(this: IExecuteFunctions, i: number): IDataObject {
	const shape = this.getNodeParameter('shape', i) as string;
	const extra = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
	return {
		shape,
		...(shape === 'square'
			? { size: this.getNodeParameter('size', i) }
			: { density: this.getNodeParameter('density', i) }),
		...(extra.radiusKm !== undefined ? { radius_km: extra.radiusKm } : {}),
		...(extra.language ? { language: extra.language } : {}),
		...(extra.country ? { country: extra.country } : {}),
		...(extra.webhookUrl ? { webhook_url: extra.webhookUrl } : {}),
	};
}

function gridBody(this: IExecuteFunctions, i: number): IDataObject {
	const listingSource = this.getNodeParameter('listingSource', i) as string;
	const listing =
		listingSource === 'placeId'
			? { place_id: this.getNodeParameter('placeId', i) as string }
			: { query: this.getNodeParameter('query', i) as string };
	return {
		...listing,
		keyword: this.getNodeParameter('keyword', i) as string,
		...formatBody.call(this, i),
	};
}

async function runGridOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<Output> {
	const shape = (grid: IDataObject) =>
		this.getNodeParameter('simplify', i, true) ? simplifyGrid(grid) : grid;

	if (operation === 'run') {
		const options = this.getNodeParameter('options', i, {}) as IDataObject;
		const headers = options.idempotencyKey
			? { 'Idempotency-Key': options.idempotencyKey }
			: undefined;
		const created = await apiRequest.call(this, 'POST', '/v1/grids', {
			body: gridBody.call(this, i),
			headers,
		});
		if (!this.getNodeParameter('waitForCompletion', i)) return one(shape(created));
		const maxWait = this.getNodeParameter('maxWaitSeconds', i) as number;
		return one(
			shape(await waitUntilDone.call(this, `/v1/grids/${String(created.id)}`, created, maxWait)),
		);
	}
	if (operation === 'estimate') {
		return one(
			await apiRequest.call(this, 'POST', '/v1/grids/estimate', { body: gridBody.call(this, i) }),
		);
	}
	if (operation === 'get') {
		const gridId = encodeURIComponent(this.getNodeParameter('gridId', i) as string);
		return one(shape(await apiRequest.call(this, 'GET', `/v1/grids/${gridId}`)));
	}
	if (operation === 'getImage') {
		const gridId = this.getNodeParameter('gridId', i) as string;
		const lang = this.getNodeParameter('lang', i) as string;
		const field = this.getNodeParameter('binaryPropertyName', i) as string;
		const png = await apiBinaryRequest.call(
			this,
			`/v1/grids/${encodeURIComponent(gridId)}/image`,
			lang ? { lang } : {},
		);
		const binary = await this.helpers.prepareBinaryData(png, `geogrid-${gridId}.png`, 'image/png');
		return [{ json: { grid_id: gridId }, binary: { [field]: binary } }];
	}
	if (operation === 'getAll') return listGrids.call(this, i);
	if (operation === 'getHistory') {
		const by = this.getNodeParameter('historyBy', i) as string;
		const qs: IDataObject =
			by === 'gridId'
				? { grid_id: this.getNodeParameter('historyGridId', i) }
				: {
						place_id: this.getNodeParameter('historyPlaceId', i),
						keyword: this.getNodeParameter('historyKeyword', i),
					};
		qs.limit = this.getNodeParameter('historyLimit', i);
		return one(await apiRequest.call(this, 'GET', '/v1/history', { qs }));
	}
	throw new NodeOperationError(this.getNode(), `Unsupported operation: grid ${operation}`, {
		itemIndex: i,
	});
}

/** GET /v1/grids, page by page (`before` = `next_before` of the previous page). */
async function listGrids(this: IExecuteFunctions, i: number): Promise<Output> {
	const returnAll = this.getNodeParameter('returnAll', i) as boolean;
	const limit = returnAll
		? Number.POSITIVE_INFINITY
		: (this.getNodeParameter('limit', i) as number);
	const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
	const base: IDataObject = {
		...(filters.placeId ? { place_id: filters.placeId } : {}),
		...(filters.keyword ? { keyword: filters.keyword } : {}),
	};
	const grids: IDataObject[] = [];
	let before: string | null = null;
	do {
		const pageSize = Math.min(PAGE_SIZE, limit - grids.length);
		const page: IDataObject = await apiRequest.call(this, 'GET', '/v1/grids', {
			qs: { ...base, limit: pageSize, ...(before ? { before } : {}) },
		});
		grids.push(...((page.data as IDataObject[] | undefined) ?? []));
		before = page.has_more ? ((page.next_before as string | null) ?? null) : null;
	} while (before && grids.length < limit);
	return many(grids.slice(0, Number.isFinite(limit) ? limit : undefined));
}

async function runBatchOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<Output> {
	if (operation === 'get') {
		const batchId = encodeURIComponent(this.getNodeParameter('batchId', i) as string);
		return one(await apiRequest.call(this, 'GET', `/v1/batches/${batchId}`));
	}
	if (operation === 'run') {
		const entries = (this.getNodeParameter('grids', i, {}) as { grid?: IDataObject[] }).grid ?? [];
		if (entries.length === 0)
			throw new NodeOperationError(this.getNode(), 'Add at least one grid to the batch', {
				itemIndex: i,
			});
		const batchItems = entries.map((entry) => ({
			keyword: entry.keyword,
			...(entry.placeId ? { place_id: entry.placeId } : { query: entry.query }),
		}));
		const created = await apiRequest.call(this, 'POST', '/v1/batches', {
			body: { ...formatBody.call(this, i), items: batchItems },
		});
		if (!this.getNodeParameter('waitForCompletion', i)) return one(created);
		const maxWait = this.getNodeParameter('maxWaitSeconds', i) as number;
		return one(
			await waitUntilDone.call(this, `/v1/batches/${String(created.id)}`, created, maxWait),
		);
	}
	throw new NodeOperationError(this.getNode(), `Unsupported operation: batch ${operation}`, {
		itemIndex: i,
	});
}

async function runScheduleOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<Output> {
	if (operation === 'create') {
		const frequency = this.getNodeParameter('frequency', i) as string;
		const body: IDataObject = {
			grid_id: this.getNodeParameter('gridId', i),
			frequency,
			...(frequency === 'weekly'
				? { weekday: this.getNodeParameter('weekday', i) }
				: { month_day: this.getNodeParameter('monthDay', i) }),
		};
		return one(await apiRequest.call(this, 'POST', '/v1/schedules', { body }));
	}
	if (operation === 'getAll')
		return many((await apiRequest.call(this, 'GET', '/v1/schedules')).data);
	const scheduleId = encodeURIComponent(this.getNodeParameter('scheduleId', i) as string);
	if (operation === 'update') {
		const body = { status: this.getNodeParameter('status', i) };
		return one(await apiRequest.call(this, 'PATCH', `/v1/schedules/${scheduleId}`, { body }));
	}
	if (operation === 'delete')
		return one(await apiRequest.call(this, 'DELETE', `/v1/schedules/${scheduleId}`));
	throw new NodeOperationError(this.getNode(), `Unsupported operation: schedule ${operation}`, {
		itemIndex: i,
	});
}
