import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class GeoGridApi implements ICredentialType {
	name = 'geoGridApi';

	displayName = 'GeoGridAPI API';

	icon: Icon = { light: 'file:../icons/geogridapi.svg', dark: 'file:../icons/geogridapi.dark.svg' };

	documentationUrl = 'https://geogridapi.io/en/docs#auth';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			placeholder: 'gga_live_…',
			description:
				'Key from the GeoGridAPI console (geogridapi.io). A gga_test_ key returns free sample grids.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.geogridapi.io',
			url: '/v1/balance',
			method: 'GET',
		},
	};
}
