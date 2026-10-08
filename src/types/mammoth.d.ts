declare module "mammoth" {
  export interface Image {
    contentType: string;
    read(): Promise<Buffer>;
  }

  export interface Result {
    value: string;
    messages: Array<{
      type: string;
      message: string;
    }>;
  }

  export interface Options {
    styleMap?: string | string[];
    includeDefaultStyleMap?: boolean;
  }

  export function extractRawText(input: { buffer: Buffer } | { path: string }): Promise<Result>;
  export function convertToHtml(input: { buffer: Buffer } | { path: string }, options?: Options): Promise<Result>;
  export function convertToMarkdown(input: { buffer: Buffer } | { path: string }, options?: Options): Promise<Result>;
}
