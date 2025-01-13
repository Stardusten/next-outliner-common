export type DataType<T extends (...args: any) => any> = (Awaited<ReturnType<T>> & {
  success: true;
})["data"];
