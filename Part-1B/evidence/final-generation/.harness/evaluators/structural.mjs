import Ajv from 'ajv';
import fs from 'fs';
import path from 'path';

const ajv = new Ajv({ allErrors: true, strict: false });
const schemaPath = path.resolve('.harness/response.schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
delete schema.$schema; // Remove meta-schema reference to prevent missing schema error

const validateHarness = ajv.compile(schema);

const specSchemaPath = path.resolve('specs/001-meeting-action-extractor/contracts/response.schema.json');
let validateSpec = null;
if (fs.existsSync(specSchemaPath)) {
  const specSchema = JSON.parse(fs.readFileSync(specSchemaPath, 'utf-8'));
  delete specSchema.$schema;
  validateSpec = ajv.compile(specSchema);
}

export function validateSchema(output) {
  if (!output || output.error) {
    return {
      valid: false,
      errors: [{ message: output?.error || 'Empty output' }]
    };
  }

  const validHarness = validateHarness(output);
  if (validHarness) {
    return { valid: true, errors: [] };
  }

  if (validateSpec && validateSpec(output)) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: validateHarness.errors || []
  };
}
