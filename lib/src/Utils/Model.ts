// Base for immutable domain models: `copy` builds a new instance of the same class from this
// one's fields plus the overrides.
//
// Each subclass assigns its own fields in its own constructor (class fields are defined after
// super() returns, so a base-class Object.assign would be overwritten), and constructors ignore
// keys they don't know, such as a constant `kind` field that `copy` passes back in.
export abstract class Model<TArgs extends object> {
	copy(overrides: Partial<TArgs>): this {
		// TypeScript types `constructor` as Function; every subclass takes its own args object.
		const Ctor = this.constructor as new (args: this & Partial<TArgs>) => this;
		return new Ctor({ ...this, ...overrides });
	}
}
