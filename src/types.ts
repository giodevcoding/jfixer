export type PackageJSON = {
  dependencies?: { [key: string]: string }
  devDependencies?: { [key: string]: string }
  [key: string]: any
}

export type NPMPackage = {
  name: string,
  version?: string
}
