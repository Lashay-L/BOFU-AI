import { supabase } from '../lib/supabase';

// Define an interface for the service, though for a single method it might be overkill for now.
// interface IOpenAIVectorStoreService {
//   createEmptyVectorStore(name: string, metadata?: Record<string, any>): Promise<VectorStore>;
// }

// Define VectorStore interface to maintain compatibility
export interface VectorStore {
  id: string;
  name: string;
  status: string;
  created_at: number;
  metadata?: Record<string, any>;
}

export class OpenAIVectorStoreService /* implements IOpenAIVectorStoreService */ {
  constructor() {
    // No client initialization needed - using Edge Functions
  }

  /**
   * Helper method to call the OpenAI Vector Store Edge Function
   */
  private async callVectorStoreEdgeFunction(action: string, params: any): Promise<any> {
    const { data, error } = await supabase.functions.invoke('openai-vector-store', {
      body: { action, ...params }
    });

    if (error) {
      console.error(`[OpenAIVectorStoreService] Edge Function error for ${action}:`, error);
      throw new Error(error.message || `Failed to execute ${action}`);
    }

    if (!data.success) {
      console.error(`[OpenAIVectorStoreService] Edge Function failed for ${action}:`, data.error);
      const errorMessage = data.error || `${action} failed`;
      
      // Create a more specific error that matches OpenAI.APIError structure for backward compatibility
      const apiError = new Error(errorMessage) as any;
      apiError.status = data.errorCode === 'VECTOR_STORE_NOT_FOUND' ? 404 : 500;
      apiError.code = data.errorCode;
      apiError.type = data.errorCode;
      
      throw apiError;
    }

    return data.data;
  }

  /**
   * Creates an empty vector store with the given name and optional metadata.
   * @param name The name of the vector store.
   * @param metadata Optional metadata to associate with the vector store. Max 16 key-value pairs, 512 bytes per key, 64KB per value.
   * @returns A promise that resolves to the created VectorStore object.
   * @throws Will throw an error if the API call fails or the API key is not configured.
   */
  async createEmptyVectorStore(
    name: string,
    metadata?: Record<string, any>
  ): Promise<VectorStore> {
    console.log(`Attempting to create OpenAI vector store with name: ${name}`);
    try {
      const vectorStore = await this.callVectorStoreEdgeFunction('create', {
        name,
        metadata
      });
      console.log(`Successfully created vector store with ID: ${vectorStore.id}. Name: ${vectorStore.name}`);
      return vectorStore;
    } catch (error) {
      console.error("Failed to create OpenAI vector store:", error);
      // Enhance error handling as needed, e.g., custom error types, logging to a monitoring service.
      if (error.status) {
        console.error('OpenAI API Error Details:', {
          status: error.status,
          message: error.message,
          code: error.code,
          type: error.type,
        });
      }
      throw error; 
    }
  }

  /**
   * Retrieves a specific vector store by its ID.
   * @param vectorStoreId The ID of the vector store to retrieve.
   * @returns A promise that resolves to the VectorStore object.
   */
  async getVectorStore(vectorStoreId: string): Promise<VectorStore> {
    return await this.callVectorStoreEdgeFunction('get', { vectorStoreId });
  }

  /**
   * Lists all vector stores.
   * @param params Optional parameters for listing, like limit and order.
   * @returns A promise that resolves to a list of VectorStore objects.
   */
  async listVectorStores(params?: any): Promise<VectorStore[]> {
    const result = await this.callVectorStoreEdgeFunction('list', { params });
    return result.data || [];
  }

  /**
   * Deletes a specific vector store by its ID.
   * @param vectorStoreId The ID of the vector store to delete.
   * @returns A promise that resolves to the deletion status.
   */
  async deleteVectorStore(vectorStoreId: string): Promise<any> {
    return await this.callVectorStoreEdgeFunction('delete', { vectorStoreId });
  }

}
