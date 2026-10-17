import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { sleep } from 'n8n-workflow';

export const BASE_URL = 'https://api.geogridapi.io';
const POLL_INTERVAL_MS = 10_000;
const OPEN_STATUSES = new Set(['pending', 'running', 'queued']);

export async function apiRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	path: string,
	options: { body?: IDataObject; qs?: IDataObject; headers?: IDataObject } = {},
): Promise<IDataObject> {
	const request: IHttpRequestOptions = {
		method,
		url: `${BASE_URL}${path}`,
		json: true,
		...(options.body ? { body: options.body } : {}),
		...(options.qs ? { qs: options.qs } : {}),
		...(options.headers ? { headers: options.headers } : {}),
	};
	return (await this.helpers.httpRequestWithAuthentication.call(
		this,
		'geoGridApi',
		request,
	)) as IDataObject;
}

export async function apiBinaryRequest(
	this: IExecuteFunctions,
	path: string,
	qs: IDataObject,
): Promise<Buffer> {
	const data = await this.helpers.httpRequestWithAuthentication.call(this, 'geoGridApi', {
		method: 'GET',
		url: `${BASE_URL}${path}`,
		qs,
		encoding: 'arraybuffer',
	});
	return Buffer.from(data as ArrayBuffer);
}

/**
 * Reads `path` every 10 seconds while its status is open (pending, running),
 * until `maxWaitSeconds`. On timeout the last state is returned as is.
 */
export async function waitUntilDone(
	this: IExecuteFunctions,
	path: string,
	first: IDataObject,
	maxWaitSeconds: number,
): Promise<IDataObject> {
	const deadline = Date.now() + maxWaitSeconds * 1000;
	let current = first;
	while (OPEN_STATUSES.has(String(current.status)) && Date.now() + POLL_INTERVAL_MS <= deadline) {
		await sleep(POLL_INTERVAL_MS);
		current = await apiRequest.call(this, 'GET', path);
	}
	return current;
}

function without(source: IDataObject, keys: string[]): IDataObject {
	return Object.fromEntries(Object.entries(source).filter(([key]) => !keys.includes(key)));
}

/** Grid without the detail of every point (coordinates and top 3 listings). */
export function simplifyGrid(grid: IDataObject): IDataObject {
	const previous = grid.previous;
	return {
		...without(grid, ['points']),
		previous:
			previous && typeof previous === 'object'
				? without(previous as IDataObject, ['ranks', 'rank_changes'])
				: null,
	};
}
