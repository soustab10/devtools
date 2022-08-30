export class ContainerItem {
  _contents: any;
  _name: string | undefined;
  _path: string;

  constructor({ contents, name, path }: { contents: any; name: string | undefined; path: string }) {
    this._contents = contents;
    this._name = name;
    this._path = path;
  }

  get contents(): any {
    return this._contents;
  }

  get name(): string | undefined {
    return this._name;
  }

  get path(): string {
    return this._path;
  }
}

export class ValueItem {
  _contents: any;
  _name: string | undefined;
  _path: string;

  constructor({ contents, name, path }: { contents: any; name: string | undefined; path: string }) {
    this._contents = contents;
    this._name = name;
    this._path = path;
  }

  get contents(): any {
    return this._contents;
  }

  get name(): string | undefined {
    return this._name;
  }

  get path(): string {
    return this._path;
  }
}

export type Item = ContainerItem | ValueItem;
