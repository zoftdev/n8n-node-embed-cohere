import type { BedrockRuntimeClientConfig } from '@aws-sdk/client-bedrock-runtime';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { BedrockEmbeddings } from '@langchain/aws';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { getNodeProxyAgent, logWrapper } from '@n8n/ai-utilities';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';
import { CohereBedrockEmbeddings, type CohereInputType } from './CohereBedrockEmbeddings';

export class EmbeddingsAwsCohere implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Embeddings AWS Cohere',
		name: 'embeddingsAwsCohere',
		icon: 'file:bedrock.svg',
		usableAsTool: true,
		credentials: [
			{
				name: 'aws',
				required: true,
			},
		],
		group: ['transform'],
		version: 1,
		description: 'Use Embeddings AWS Bedrock with Cohere models (proper input_type support)',
		defaults: {
			name: 'Embeddings AWS Cohere',
		},

		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Embeddings'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-embed.html',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiEmbedding],
		outputNames: ['Embeddings'],
		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL: '=https://bedrock.{{$credentials?.region ?? "us-east-1"}}.amazonaws.com',
		},
		properties: [
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				description:
					'The Cohere embedding model to use. <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-embed.html">Learn more</a>.',
				typeOptions: {
					loadOptions: {
						routing: {
							request: {
								method: 'GET',
								url: '/foundation-models?byInferenceType=ON_DEMAND&byOutputModality=EMBEDDING',
							},
							output: {
								postReceive: [
									{
										type: 'rootProperty',
										properties: {
											property: 'modelSummaries',
										},
									},
									{
										type: 'setKeyValue',
										properties: {
											name: '={{$responseItem.modelName}}',
											description: '={{$responseItem.modelArn}}',
											value: '={{$responseItem.modelId}}',
										},
									},
									{
										type: 'sort',
										properties: {
											key: 'name',
										},
									},
								],
							},
						},
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'model',
					},
				},
				default: 'cohere.embed-english-v3',
			},
			{
				displayName: 'Use Cohere Format',
				name: 'useCohereFormat',
				type: 'boolean',
				default: true,
				description:
					'Whether to use Cohere-specific request format with input_type. Enable for Cohere models, disable for Titan/other models.',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						useCohereFormat: [true],
					},
				},
				options: [
					{
						displayName: 'Document Input Type',
						name: 'inputTypeDocument',
						type: 'options',
						default: 'search_document',
						description: 'Input type when embedding documents for storage',
						options: [
							{
								name: 'Search Document',
								value: 'search_document',
								description: 'Use when encoding documents for a vector database',
							},
							{
								name: 'Classification',
								value: 'classification',
								description: 'Use for text classification tasks',
							},
							{
								name: 'Clustering',
								value: 'clustering',
								description: 'Use for clustering embeddings',
							},
						],
					},
					{
						displayName: 'Query Input Type',
						name: 'inputTypeQuery',
						type: 'options',
						default: 'search_query',
						description: 'Input type when embedding queries for search',
						options: [
							{
								name: 'Search Query',
								value: 'search_query',
								description: 'Use when querying a vector database',
							},
							{
								name: 'Classification',
								value: 'classification',
								description: 'Use for text classification tasks',
							},
							{
								name: 'Clustering',
								value: 'clustering',
								description: 'Use for clustering embeddings',
							},
						],
					},
					{
						displayName: 'Truncate',
						name: 'truncate',
						type: 'options',
						default: 'END',
						description: 'How to handle texts longer than max tokens',
						options: [
							{
								name: 'End',
								value: 'END',
								description: 'Truncate from the end (recommended)',
							},
							{
								name: 'Start',
								value: 'START',
								description: 'Truncate from the start',
							},
							{
								name: 'None',
								value: 'NONE',
								description: 'Return error if text is too long',
							},
						],
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials<{
			region: string;
			secretAccessKey: string;
			accessKeyId: string;
			sessionToken: string;
		}>('aws');
		const modelName = this.getNodeParameter('model', itemIndex) as string;
		const useCohereFormat = this.getNodeParameter('useCohereFormat', itemIndex, true) as boolean;

		const clientConfig: BedrockRuntimeClientConfig = {
			region: credentials.region,
			credentials: {
				secretAccessKey: credentials.secretAccessKey,
				accessKeyId: credentials.accessKeyId,
				sessionToken: credentials.sessionToken,
			},
		};

		const proxyAgent = getNodeProxyAgent();
		if (proxyAgent) {
			clientConfig.requestHandler = new NodeHttpHandler({
				httpAgent: proxyAgent,
				httpsAgent: proxyAgent,
			});
		}

		const client = new BedrockRuntimeClient(clientConfig);

		let embeddings;

		if (useCohereFormat) {
			// Use custom Cohere embeddings with proper input_type support
			const options = this.getNodeParameter('options', itemIndex, {}) as {
				inputTypeDocument?: CohereInputType;
				inputTypeQuery?: CohereInputType;
				truncate?: 'NONE' | 'START' | 'END';
			};

			embeddings = new CohereBedrockEmbeddings({
				client,
				model: modelName,
				inputTypeDocument: options.inputTypeDocument ?? 'search_document',
				inputTypeQuery: options.inputTypeQuery ?? 'search_query',
				truncate: options.truncate ?? 'END',
				maxRetries: 3,
			});
		} else {
			// Use standard BedrockEmbeddings for Titan/other models
			embeddings = new BedrockEmbeddings({
				client,
				model: modelName,
				maxRetries: 3,
				region: credentials.region,
			});
		}

		return {
			response: logWrapper(embeddings, this),
		};
	}
}
