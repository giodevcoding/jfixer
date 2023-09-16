export type PackageJSON = {
  dependencies?: { [key: string]: string };
  devDependencies?: { [key: string]: string };
  [key: string]: any;
};

export type NPMPackage = {
  name: string;
  version?: string;
};

export type OldFieldWithValidator = {
  name: string;
  type: "text" | "string" | "textarea" | "datetime-local" | "email" | "password";
  validator: OldValidatorSchema;
};

export type OldValidatorSchema = {
  required?: OldValidator<boolean>;
  number?: OldValidator<boolean>;
  pattern?: OldValidator<string>;
  minLength?: OldValidator<number>;
  maxLength?: OldValidator<number>;
  match?: OldValidator<string>;
};

export type OldValidator<T> = {
  value: T;
  errorMessage: string;
};
