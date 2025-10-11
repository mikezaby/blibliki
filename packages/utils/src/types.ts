export type AtLeast<T, K extends keyof T> = Partial<T> & Pick<T, K>;
export type Optional<T, K extends keyof T> = Partial<Pick<T, K>> & Omit<T, K>;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface EmptyObject {}
