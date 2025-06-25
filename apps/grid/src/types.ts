export type AtLeast<T, K extends keyof T> = Partial<T> & Pick<T, K>;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<T>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyObject = { [Key: string]: any };
