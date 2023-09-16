import * as fs from "node:fs/promises";
import { jfixerlog } from "./util";
import { OldFieldWithValidator, OldValidator, OldValidatorSchema } from "./types";

/**
 * Updates availity-reactstrap-validation to @availity/form and the imported components.
 *
 * @throws NodeJS.ErrnoException
 */
export function updateAvailityPackages(
  path: string,
  lines: readonly string[],
): void | never {
  const maxLines = Math.min(lines.length, 20);

  let availityLineIndex = -1;

  for (let i = 0; i < maxLines; i++) {
    const line = lines[i];
    if (line.includes("availity-reactstrap-validation")) {
      availityLineIndex = i;
      break;
    }
  }

  if (availityLineIndex === -1) {
    return;
  }

  fs.readFile(path)
    .then((data) => {
      const initialReplacments = getInitialAvailityReplacements(
        data.toString(),
      );
      const withInitialValues = insertAvailityInitialValues(initialReplacments);
      const withUpdatedSubmit = updateAvailitySubmit(withInitialValues);
      const withFixedFormGroups = fixAvailityFormGroups(withUpdatedSubmit);
      const withSchemaValidation = addSchemaValidation(withFixedFormGroups);

      fs.writeFile(path, withSchemaValidation).then(() => {
        jfixerlog(
          "Updated availity-reactstrap-validation to @availity/form in:",
          path,
        );
      });
    })
    .catch((err: NodeJS.ErrnoException) => {
      throw err;
    });
}

function getInitialAvailityReplacements(data: string): string {
  return data
    .replaceAll(/availity-reactstrap-validation;*/g, "@availity/form")
    .replaceAll(/AvFeedback,\s*(?=.*availity)/g, "")
    .replaceAll(/<AvFeedback/g, '<span className="invalid-feedback"')
    .replaceAll(/<\/AvFeedback.*>/g, "</span>")
    .replaceAll(/AvForm/g, "Form")
    .replaceAll(/AvGroup/g, "FormGroup")
    .replaceAll(/AvInput/g, "Input")
    .replaceAll(/AvField/g, "Field")
    .replaceAll(/onValidSubmit/g, "onSubmit")
    .replace(/import(?![\s\S]*import)/, "import * as yup from 'yup';\nimport");
}

function insertAvailityInitialValues(data: string): string {
  const names = getAvailityFieldNames(data);
  const initialValueObjectString = getInitialValueObjectString(names);

  const newData = data
    .replace(/export/, initialValueObjectString)
    .replaceAll(/<Form\s(?!.*model)/g, "<Form initialValues={initialValues} ")
    .replaceAll(/(?<=model=\{\s?isNew\s?\?\s?){}(?=\s?:)/g, "initialValues")
    .replaceAll(/(?<=<Form.*)model/g, "initialValues");

  return newData;
}

function updateAvailitySubmit(data: string): string {
  const newData = data.replace(
    /\(event,\s?errors,\s?values\)\s?=>\s?\{/,
    "async (values, helpers) => {\n    const errors = await helpers.validateForm(values);",
  );

  const destructuredValuesRegex = /(?<=\(event,\s?errors,\s?){.*}/;
  const executedDestructuredRegex = destructuredValuesRegex.exec(newData);

  if (executedDestructuredRegex !== null) {
    const destructuredValuesString = executedDestructuredRegex[0];
    return newData.replace(
      /\(event,\s?errors,\s?\{.*\}\)\s?=>\s?\{/,
      `async (values, helpers) => {\n    const ${destructuredValuesString} = values;\n    const errors = await helpers.validateForm(values);`,
    );
  }

  return newData;
}

function fixAvailityFormGroups(data: string): string {
  let newData = data;
  const getIdRegex =
    /(?<=<FormGroup[\s\S]*(?:Input|Field)[^=Label]*id=")[^"]*(?="[\s\S]*<\/FormGroup)/gm;
  const formGroupRegex =
    /<FormGroup(?!.*for)(?=[\s\S]*[Input|Field][\s\S]*<\/FormGroup>)/m;

  const ids = data.match(getIdRegex);

  ids?.forEach((id) => {
    newData = newData.replace(formGroupRegex, `<FormGroup for="${id}" `);
  });

  return newData;
}

function addSchemaValidation(data: string): string {
  // TODO: Read existing validation and create new yup validation schema,
  // then remove old validation. Only place yup validation will not suffice
  // is for matching passwords, I believe
  
  /*
  if (!data.includes("validate={{")) return data;

  const nameRegex =
    /(?<=name=").*(?="[\s\S]*validate=\{\s*(?:[\s\S]*?)\}\s*\}})/g;
  const typeRegex =
    /(?<=type=").*(?="[\s\S]*validate=\{\s*(?:[\s\S]*?)\}\s*\}})/g;
  const validatorRegex = /(?<=validate=\{)\s*(?:[^()]*?)\}\s*\}(?=})/g;
  const names = data.match(nameRegex) ?? [];
  const types = data.match(typeRegex) ?? [];
  const validators = data
    .match(validatorRegex)
    ?.map<OldValidatorSchema | null>((match) => {
      if (match.includes("//")) {
        return null;
      }
      return JSON.parse(match.replaceAll(/(?=\b[a-zA-Z]*\b:)|'/g, '"'));
    });

  const allValidatorFields: OldFieldWithValidator[] = [];
  validators?.forEach((validator, index) => {
    if (validator != null) {
      allValidatorFields.push({
        name: names?.[index],
        type: types?.[index] as OldFieldWithValidator["type"],
        validator,
      });
    }
  });

  const newData = data
    .replace(
      /(?<=const initialValues = {[\s\S]*)}/m,
      getYupValidationSchema(allValidatorFields),
    )
    .replaceAll(/(?<=<Form.*)>/g, " validationSchema={validationSchema}>");

    */
  return data;
}

function getYupValidationSchema(fields: OldFieldWithValidator[]) {
  let schema = "}\n\nconst validationSchema = yup.object({";
  fields.forEach((field) => {
    schema = schema.concat("\n  ", createYupValidaton(field), ",");
  });
  schema = schema.concat("\n});\n");
  return schema;
}

function createYupValidaton({
  name,
  type,
  validator,
}: OldFieldWithValidator): string {

  let validation = `${name}: ${getYupType(type, validator)}`;

  return validation;
}

function getYupType(type: OldFieldWithValidator["type"], validator: OldValidatorSchema) {
  if (Object.keys(validator).includes("number")) {
    return "yup.number()"
  }

  if (type === "text" || type === "textarea" || type === "string" || type === "password") {
    return 'yup.string()'
  }

  if ( type === "email" ) {
    return "yup.string().email()"
  }

  if (type === "datetime-local") {
    return "yup.date()"
  }

  return "yup.string()"
}

function getAvailityFieldNames(data: string): string[] {
  const namesRegex = /(?<=name=")(?<=").*(?=")/g;
  let resultName: RegExpExecArray | null = null;

  const names: string[] = [];

  while ((resultName = namesRegex.exec(data))) {
    if (resultName?.[0] != null) {
      names.push(resultName[0]);
    }
  }
  return names;
}

function getInitialValueObjectString(fieldNames: string[]): string {
  let initialValueObjectString = "\nconst initialValues = {";
  fieldNames.forEach((name) => {
    initialValueObjectString = initialValueObjectString.concat(
      `\n  ${name}: null,`,
    );
  });
  initialValueObjectString = initialValueObjectString.concat("\n}\n\nexport");

  return initialValueObjectString;
}
