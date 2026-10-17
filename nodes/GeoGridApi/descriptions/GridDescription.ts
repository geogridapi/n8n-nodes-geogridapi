import type { INodeProperties } from 'n8n-workflow';
import { formatFields, showFor, waitFields } from './shared';

const GRID = ['grid'];

export const gridOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: showFor(GRID),
		options: [
			{
				name: 'Estimate',
				value: 'estimate',
				description: 'Get the exact number of points and credits of a grid without running it',
				action: 'Estimate a grid',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a grid with its ranks, competitors ahead and change since the previous grid',
				action: 'Get a grid',
			},
			{
				name: 'Get History',
				value: 'getHistory',
				description: 'Get the ranking trend of a listing for a keyword',
				action: 'Get the history of a grid',
			},
			{
				name: 'Get Image',
				value: 'getImage',
				description: 'Download the PNG heatmap of a completed grid',
				action: 'Get the image of a grid',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'List past grids, newest first',
				action: 'Get many grids',
			},
			{
				name: 'Run',
				value: 'run',
				description: 'Measure the Google Maps rank of a listing for a keyword at every point of a grid',
				action: 'Run a grid',
			},
		],
		default: 'run',
	},
];

const RUN_OR_ESTIMATE = ['run', 'estimate'];

const listingFields: INodeProperties[] = [
	{
		displayName: 'Listing',
		name: 'listingSource',
		type: 'options',
		options: [
			{ name: 'Name and City', value: 'query' },
			{ name: 'Place ID', value: 'placeId' },
		],
		default: 'query',
		description: 'How to designate the Google Business Profile',
		displayOptions: showFor(GRID, RUN_OR_ESTIMATE),
	},
	{
		displayName: 'Name and City',
		name: 'query',
		type: 'string',
		required: true,
		default: '',
		placeholder: "Joe's Pizza, New York",
		description: 'Listing name and city; the first match is measured',
		displayOptions: { show: { resource: GRID, operation: RUN_OR_ESTIMATE, listingSource: ['query'] } },
	},
	{
		displayName: 'Place ID',
		name: 'placeId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'ChIJ…',
		description: 'Google place ID of the listing. Find it with Listing → Search.',
		displayOptions: { show: { resource: GRID, operation: RUN_OR_ESTIMATE, listingSource: ['placeId'] } },
	},
	{
		displayName: 'Keyword',
		name: 'keyword',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'pizza',
		description: 'Keyword searched on Google Maps, as your customers type it',
		displayOptions: showFor(GRID, RUN_OR_ESTIMATE),
	},
];

const gridIdField: INodeProperties = {
	displayName: 'Grid ID',
	name: 'gridId',
	type: 'string',
	required: true,
	default: '',
	description: 'ID of the grid (UUID)',
	displayOptions: showFor(GRID, ['get', 'getImage']),
};

const simplifyField: INodeProperties = {
	displayName: 'Simplify',
	name: 'simplify',
	type: 'boolean',
	default: true,
	description:
		'Whether to return a simplified version of the grid, without the detail of each point (coordinates and top 3 listings)',
	displayOptions: showFor(GRID, ['run', 'get']),
};

const runOptions: INodeProperties = {
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	placeholder: 'Add Option',
	default: {},
	displayOptions: showFor(GRID, ['run']),
	options: [
		{
			displayName: 'Idempotency Key',
			name: 'idempotencyKey',
			type: 'string',
			default: '',
			description: 'The same key returns the grid already created, with no new charge',
		},
	],
};

const imageFields: INodeProperties[] = [
	{
		displayName: 'Image Language',
		name: 'lang',
		type: 'options',
		options: [
			{ name: 'Account Language', value: '' },
			{ name: 'English', value: 'en' },
			{ name: 'French', value: 'fr' },
		],
		default: '',
		description: 'Language of the texts drawn on the image',
		displayOptions: showFor(GRID, ['getImage']),
	},
	{
		displayName: 'Put Output File in Field',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		hint: 'The name of the output binary field to put the PNG in',
		displayOptions: showFor(GRID, ['getImage']),
	},
];

const getAllFields: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: showFor(GRID, ['getAll']),
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: { show: { resource: GRID, operation: ['getAll'], returnAll: [false] } },
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: showFor(GRID, ['getAll']),
		options: [
			{
				displayName: 'Keyword',
				name: 'keyword',
				type: 'string',
				default: '',
				description: 'Exact keyword, case-insensitive',
			},
			{
				displayName: 'Place ID',
				name: 'placeId',
				type: 'string',
				default: '',
				description: 'Only the grids of this listing',
			},
		],
	},
];

const historyFields: INodeProperties[] = [
	{
		displayName: 'Map',
		name: 'historyBy',
		type: 'options',
		options: [
			{ name: 'Grid ID', value: 'gridId' },
			{ name: 'Place ID and Keyword', value: 'placeKeyword' },
		],
		default: 'gridId',
		description: 'How to designate the map (same listing, keyword, format, radius and center)',
		displayOptions: showFor(GRID, ['getHistory']),
	},
	{
		displayName: 'Grid ID',
		name: 'historyGridId',
		type: 'string',
		required: true,
		default: '',
		description: 'Any grid of the map',
		displayOptions: { show: { resource: GRID, operation: ['getHistory'], historyBy: ['gridId'] } },
	},
	{
		displayName: 'Place ID',
		name: 'historyPlaceId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: GRID, operation: ['getHistory'], historyBy: ['placeKeyword'] } },
	},
	{
		displayName: 'Keyword',
		name: 'historyKeyword',
		type: 'string',
		required: true,
		default: '',
		description: 'The latest grid of this listing and keyword sets the format',
		displayOptions: { show: { resource: GRID, operation: ['getHistory'], historyBy: ['placeKeyword'] } },
	},
	{
		displayName: 'Limit',
		name: 'historyLimit',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 100 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: showFor(GRID, ['getHistory']),
	},
];

export const gridFields: INodeProperties[] = [
	...listingFields,
	...formatFields(GRID, RUN_OR_ESTIMATE),
	...waitFields(GRID, ['run'], 'grid'),
	runOptions,
	gridIdField,
	simplifyField,
	...imageFields,
	...getAllFields,
	...historyFields,
];
