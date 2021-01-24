
export const handleError = (response: Response): Promise<string> => response.json()
  .then((obj) => obj.message)
  .catch(() => response.text()
    .then((obj) => obj)
    .catch(() => 'failed for unknown reason'));

export const getRandomInt = (min: number, max: number): number => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min);
};
