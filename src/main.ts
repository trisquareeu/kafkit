const bootstrap = async (): Promise<void> => {
  console.log('Hello World');
};

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
