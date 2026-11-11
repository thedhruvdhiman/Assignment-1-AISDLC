export class ModelServiceError extends Error {
  constructor(message, { cause, code = "MODEL_SERVICE_ERROR" } = {}) {
    super(message, { cause });
    this.name = "ModelServiceError";
    this.code = code;
  }
}
