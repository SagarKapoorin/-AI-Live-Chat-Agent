export class HttpError extends Error {
  status: number;
  publicMessage: string;

  constructor(status: number, publicMessage: string, message?: string) {
    super(message ?? publicMessage);
    this.status = status;
    this.publicMessage = publicMessage;
  }
}
