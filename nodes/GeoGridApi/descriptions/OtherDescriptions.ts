import type { INodeProperties } from 'n8n-workflow';
import { formatFields, showFor, waitFields } from './shared';

const LISTING = ['listing'];
const BATCH = ['batch'];
const SCHEDULE = ['schedule'];
const ACCOUNT = ['account'];

export const listingOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: showFor(LISTING),
		options: [
			{
				name: 'Search',
				value: 'search',
				description: 'Find a Google Business Profile by name and city to get its place ID',
				action: 'Search listings',
			},
		],
		default: 'search',
	},
];

export const listingFields: INodeProperties[] = [
	{
		displayName: 'Search Query',
		name: 'q',
		type: 'string',
		required: true,
		default: '',
		placeholder: "Joe's Pizza New York",
		description: 'Listing name and city',
		displayOptions: showFor(LISTING, ['search']),
	},
	{
		displayName: 'Language',
		name: 'language',
		type: 'string',
		default: 'en',
		description: '2-letter language code of the results',
		displayOptions: showFor(LISTING, ['search']),
	},
];

export const batchOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: showFor(BATCH),
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a batch and the status of each of its grids',
				action: 'Get a batch',
			},
			{
				name: 'Run',
				value: 'run',
				description: 'Run up to 50 grids with the same format in one call',
				action: 'Run a batch of grids',
			},
		],
		default: 'run',
	},
];

export const batchFields: INodeProperties[] = [
	{
		displayName: 'Grids',
		name: 'grids',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Grid',
		required: true,
		default: {},
		description: 'Up to 50 grids: one listing with several keywords, or several listings with one keyword',
		displayOptions: showFor(BATCH, ['run']),
		options: [
			{
				displayName: 'Grid',
				name: 'grid',
				values: [
					{
						displayName: 'Keyword',
						name: 'keyword',
						type: 'string',
						required: true,
						default: '',
					},
					{
						displayName: 'Name and City',
						name: 'query',
						type: 'string',
						default: '',
						description: 'Listing name and city. Leave empty when you give a place ID.',
					},
					{
						displayName: 'Place ID',
						name: 'placeId',
						type: 'string',
						default: '',
						description: 'Google place ID of the listing. Leave empty when you give a name and city.',
					},
				],
			},
		],
	},
	...formatFields(BATCH, ['run']),
	...waitFields(BATCH, ['run'], 'batch'),
	{
		displayName: 'Batch ID',
		name: 'batchId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: showFor(BATCH, ['get']),
	},
];

export const scheduleOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: showFor(SCHEDULE),
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Repeat a grid every week or every month',
				action: 'Create a schedule',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Stop a repeated grid',
				action: 'Delete a schedule',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'List repeated grids',
				action: 'Get many schedules',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Pause or resume a repeated grid',
				action: 'Update a schedule',
			},
		],
		default: 'create',
	},
];

export const scheduleFields: INodeProperties[] = [
	{
		displayName: 'Grid ID',
		name: 'gridId',
		type: 'string',
		required: true,
		default: '',
		description: 'A completed grid to repeat (same listing, keyword, format and radius)',
		displayOptions: showFor(SCHEDULE, ['create']),
	},
	{
		displayName: 'Frequency',
		name: 'frequency',
		type: 'options',
		options: [
			{ name: 'Monthly', value: 'monthly' },
			{ name: 'Weekly', value: 'weekly' },
		],
		default: 'weekly',
		description: 'Runs around 7 am Paris time',
		displayOptions: showFor(SCHEDULE, ['create']),
	},
	{
		displayName: 'Weekday',
		name: 'weekday',
		type: 'options',
		options: [
			{ name: 'Friday', value: 5 },
			{ name: 'Monday', value: 1 },
			{ name: 'Saturday', value: 6 },
			{ name: 'Sunday', value: 7 },
			{ name: 'Thursday', value: 4 },
			{ name: 'Tuesday', value: 2 },
			{ name: 'Wednesday', value: 3 },
		],
		default: 1,
		displayOptions: { show: { resource: SCHEDULE, operation: ['create'], frequency: ['weekly'] } },
	},
	{
		displayName: 'Day of Month',
		name: 'monthDay',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 28 },
		default: 1,
		displayOptions: { show: { resource: SCHEDULE, operation: ['create'], frequency: ['monthly'] } },
	},
	{
		displayName: 'Schedule ID',
		name: 'scheduleId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: showFor(SCHEDULE, ['update', 'delete']),
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		options: [
			{ name: 'Active', value: 'active' },
			{ name: 'Paused', value: 'paused' },
		],
		default: 'paused',
		displayOptions: showFor(SCHEDULE, ['update']),
	},
];

export const accountOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: showFor(ACCOUNT),
		options: [
			{
				name: 'Get Balance',
				value: 'getBalance',
				description: 'Get the credits balance of the account',
				action: 'Get the credits balance',
			},
		],
		default: 'getBalance',
	},
];
