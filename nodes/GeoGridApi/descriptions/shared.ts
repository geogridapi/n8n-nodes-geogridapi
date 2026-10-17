import type { INodeProperties } from 'n8n-workflow';

/** Shows a property only for these resource / operation pairs. */
export function showFor(resource: string[], operation?: string[]): INodeProperties['displayOptions'] {
	return { show: operation ? { resource, operation } : { resource } };
}

/**
 * Grid format, shared by Grid → Run, Grid → Estimate and Batch → Run.
 * Square grids take a size, every other shape a density.
 */
export function formatFields(resource: string[], operation: string[]): INodeProperties[] {
	return [
		{
			displayName: 'Shape',
			name: 'shape',
			type: 'options',
			options: [
				{ name: 'Circle', value: 'circle' },
				{ name: 'Cross', value: 'cross' },
				{ name: 'Diamond', value: 'diamond' },
				{ name: 'Ellipse', value: 'ellipse' },
				{ name: 'Hexagon', value: 'hexagon' },
				{ name: 'Rectangle', value: 'rectangle' },
				{ name: 'Square', value: 'square' },
			],
			default: 'square',
			description: 'Shape of the grid around the listing',
			displayOptions: showFor(resource, operation),
		},
		{
			displayName: 'Size',
			name: 'size',
			type: 'options',
			options: [
				{ name: '3 × 3 (9 Points)', value: 3 },
				{ name: '5 × 5 (25 Points)', value: 5 },
				{ name: '7 × 7 (49 Points)', value: 7 },
				{ name: '9 × 9 (81 Points)', value: 9 },
			],
			default: 7,
			description: 'Side of the square grid. Cost: size × size credits.',
			displayOptions: { show: { resource, operation, shape: ['square'] } },
		},
		{
			displayName: 'Density',
			name: 'density',
			type: 'options',
			options: [
				{ name: 'High', value: 'high' },
				{ name: 'Low', value: 'low' },
				{ name: 'Medium', value: 'medium' },
			],
			default: 'medium',
			description:
				'Lattice density. Points: circle 13/29/49, diamond 13/25/41, hexagon 17/27/47, cross 21/33/45, ellipse 19/35/45, rectangle 15/35/45 (low/medium/high).',
			displayOptions: {
				show: { resource, operation },
				hide: { shape: ['square'] },
			},
		},
		{
			displayName: 'Additional Fields',
			name: 'additionalFields',
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			displayOptions: showFor(resource, operation),
			options: [
				{
					displayName: 'Country',
					name: 'country',
					type: 'string',
					default: '',
					placeholder: 'US',
					description: 'Search country (2-letter ISO code)',
				},
				{
					displayName: 'Language',
					name: 'language',
					type: 'string',
					default: '',
					placeholder: 'en',
					description: 'Search language (2-letter code). Defaults to the account language.',
				},
				{
					displayName: 'Radius (Km)',
					name: 'radiusKm',
					type: 'number',
					typeOptions: { minValue: 0.5, maxValue: 30, numberPrecision: 1 },
					default: 3,
					description:
						'Distance from the center to the edge of the grid: 0.5 to 30 km for a square, 1 to 30 km for other shapes',
				},
				{
					displayName: 'Webhook URL',
					name: 'webhookUrl',
					type: 'string',
					default: '',
					placeholder: 'https://example.com/webhooks/geogridapi',
					description: 'Public HTTPS URL called with the grid when it completes or fails',
				},
			],
		},
	];
}

/** "Wait for Completion" toggle and its timeout. */
export function waitFields(resource: string[], operation: string[], what: string): INodeProperties[] {
	return [
		{
			displayName: 'Wait for Completion',
			name: 'waitForCompletion',
			type: 'boolean',
			default: true,
			description: `Whether to wait until the ${what} is completed and return the result. Otherwise the node returns right away with status pending.`,
			displayOptions: showFor(resource, operation),
		},
		{
			displayName: 'Max Wait (Seconds)',
			name: 'maxWaitSeconds',
			type: 'number',
			typeOptions: { minValue: 10, maxValue: 3600 },
			default: 300,
			description: `How long to wait for the ${what}. On timeout the node returns it with its current status.`,
			displayOptions: { show: { resource, operation, waitForCompletion: [true] } },
		},
	];
}
