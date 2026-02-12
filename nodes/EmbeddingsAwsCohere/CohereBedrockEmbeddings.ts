import {
	BedrockRuntimeClient,
	InvokeModelCommand,
	type BedrockRuntimeClientConfig,
} from '@aws-sdk/client-bedrock-runtime';
import { Embeddings, type EmbeddingsParams } from '@langchain/core/embeddings';

/**
 * Cohere input_type options for embeddings
 * @see https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-embed.html
 */
export type CohereInputType = 'search_document' | 'search_query' | 'classification' | 'clustering';

/**
 * Cohere truncate options
 */
export type CohereTruncate = 'NONE' | 'START' | 'END';

/**
 * Configuration for CohereBedrockEmbeddings
 */
export interface CohereBedrockEmbeddingsParams extends EmbeddingsParams {
	/**
	 * Cohere model ID (e.g., "cohere.embed-english-v3", "cohere.embed-multilingual-v3")
	 */
	model: string;

	/**
	 * AWS region
	 */
	region?: string;

	/**
	 * Pre-configured BedrockRuntimeClient
	 */
	client?: BedrockRuntimeClient;

	/**
	 * Client configuration options (ignored if client is provided)
	 */
	clientOptions?: BedrockRuntimeClientConfig;

	/**
	 * Input type for documents (default: "search_document")
	 */
	inputTypeDocument?: CohereInputType;

	/**
	 * Input type for queries (default: "search_query")
	 */
	inputTypeQuery?: CohereInputType;

	/**
	 * How to handle texts longer than max tokens
	 * - NONE: Returns error if text is too long
	 * - START: Truncates from the start
	 * - END: Truncates from the end (default)
	 */
	truncate?: CohereTruncate;

	/**
	 * Maximum number of texts per batch (max 96 for Cohere)
	 */
	batchSize?: number;

	/**
	 * Maximum retries for failed requests
	 */
	maxRetries?: number;
}

/**
 * Cohere Embed v3 response format
 */
interface CohereEmbedV3Response {
	embeddings: number[][];
	id: string;
	texts: string[];
}

/**
 * Cohere Embed v4 response format
 */
interface CohereEmbedV4Response {
	embeddings: {
		float: number[][];
	};
	id: string;
	texts: string[];
}

type CohereEmbedResponse = CohereEmbedV3Response | CohereEmbedV4Response;

/**
 * Custom embeddings class for Cohere models on AWS Bedrock.
 *
 * Properly handles Cohere's request format:
 * - Uses `texts` array instead of `inputText`
 * - Supports `input_type` for search_document vs search_query
 * - Handles both v3 and v4 response formats
 *
 * @example
 * ```typescript
 * const embeddings = new CohereBedrockEmbeddings({
 *   model: 'cohere.embed-english-v3',
 *   region: 'us-east-1',
 *   inputTypeDocument: 'search_document',
 *   inputTypeQuery: 'search_query',
 * });
 *
 * // For documents (uses search_document)
 * const docEmbeddings = await embeddings.embedDocuments(['Hello world']);
 *
 * // For queries (uses search_query)
 * const queryEmbedding = await embeddings.embedQuery('What is hello?');
 * ```
 */
export class CohereBedrockEmbeddings extends Embeddings {
	model: string;
	client: BedrockRuntimeClient;
	inputTypeDocument: CohereInputType;
	inputTypeQuery: CohereInputType;
	truncate: CohereTruncate;
	batchSize: number;
	maxRetries: number;

	constructor(params: CohereBedrockEmbeddingsParams) {
		super(params);

		this.model = params.model;
		this.inputTypeDocument = params.inputTypeDocument ?? 'search_document';
		this.inputTypeQuery = params.inputTypeQuery ?? 'search_query';
		this.truncate = params.truncate ?? 'END';
		this.batchSize = Math.min(params.batchSize ?? 96, 96); // Cohere max is 96
		this.maxRetries = params.maxRetries ?? 3;

		this.client =
			params.client ??
			new BedrockRuntimeClient({
				...params.clientOptions,
				region: params.region,
			});
	}

	/**
	 * Invoke Cohere Embed model on Bedrock
	 */
	private async invokeCohere(texts: string[], inputType: CohereInputType): Promise<number[][]> {
		// Clean texts - replace newlines which can affect performance
		const cleanedTexts = texts.map((text) => text.replace(/\n/g, ' '));

		const requestBody = {
			texts: cleanedTexts,
			input_type: inputType,
			truncate: this.truncate,
		};

		const command = new InvokeModelCommand({
			modelId: this.model,
			body: JSON.stringify(requestBody),
			contentType: 'application/json',
			accept: 'application/json',
		});

		const response = await this.client.send(command);
		const responseBody = new TextDecoder().decode(response.body);
		const parsed: CohereEmbedResponse = JSON.parse(responseBody);

		// Handle both v3 and v4 response formats
		return this.extractEmbeddings(parsed);
	}

	/**
	 * Extract embeddings from response, handling v3 and v4 format differences
	 */
	private extractEmbeddings(response: CohereEmbedResponse): number[][] {
		// Check if it's v4 format (embeddings.float)
		if (
			typeof response.embeddings === 'object' &&
			!Array.isArray(response.embeddings) &&
			'float' in response.embeddings
		) {
			return response.embeddings.float;
		}

		// v3 format (embeddings is directly the array)
		if (Array.isArray(response.embeddings)) {
			return response.embeddings;
		}

		throw new Error(`Unexpected Cohere response format: ${JSON.stringify(response)}`);
	}

	/**
	 * Batch texts into chunks of batchSize
	 */
	private batchTexts<T>(texts: T[]): T[][] {
		const batches: T[][] = [];
		for (let i = 0; i < texts.length; i += this.batchSize) {
			batches.push(texts.slice(i, i + this.batchSize));
		}
		return batches;
	}

	/**
	 * Embed documents using input_type: "search_document"
	 * Use this when encoding documents for storage in a vector database
	 */
	async embedDocuments(documents: string[]): Promise<number[][]> {
		if (documents.length === 0) {
			return [];
		}

		const batches = this.batchTexts(documents);
		const allEmbeddings: number[][] = [];

		for (const batch of batches) {
			const embeddings = await this.caller.call(
				async () => this.invokeCohere(batch, this.inputTypeDocument),
			);
			allEmbeddings.push(...embeddings);
		}

		return allEmbeddings;
	}

	/**
	 * Embed a single query using input_type: "search_query"
	 * Use this when encoding a query to search against documents
	 */
	async embedQuery(query: string): Promise<number[]> {
		const embeddings = await this.caller.call(
			async () => this.invokeCohere([query], this.inputTypeQuery),
		);

		return embeddings[0];
	}
}
