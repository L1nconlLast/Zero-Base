declare namespace Deno {
  namespace env {
    function get(key: string): string | undefined;
  }
}

declare module 'https://deno.land/std@0.224.0/http/server.ts' {
  export function serve(
    handler: (req: Request) => Response | Promise<Response>,
  ): void;
}

declare module 'https://esm.sh/@supabase/supabase-js@2.45.1' {
  export interface SupabaseRpcError {
    message: string;
  }

  export interface SupabaseRpcResult<T = unknown> {
    data: T | null;
    error: SupabaseRpcError | null;
  }

  export interface SupabaseClientLike {
    rpc<T = unknown>(
      functionName: string,
      args?: Record<string, unknown>,
    ): Promise<SupabaseRpcResult<T>>;
  }

  export function createClient(url: string, key: string): SupabaseClientLike;
}
