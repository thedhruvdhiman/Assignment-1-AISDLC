import Ajv from 'ajv';
import fs from 'fs';
import path from 'path';

const ajv = new Ajv({ allErrors: true, strict: false });
const schemaPath = path.resolve('.harness/response.schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
delete schema.$schema; // Remove meta-schema reference to prevent missing schema error

const validate = ajv.compile(schema);

export function validateSchema(output) {
  const valid = validate(output);
  return {
    valid,
    errors: validate.errors || []
  };
}
