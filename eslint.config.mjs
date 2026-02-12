import { configWithoutCloudSupport } from '@n8n/node-cli/eslint';

export default [
	...configWithoutCloudSupport,
	{
		rules: {
			// Allow reusing built-in n8n credentials (aws) for self-hosted nodes
			'@n8n/community-nodes/no-credential-reuse': 'off',
		},
	},
];
