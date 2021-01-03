
export const handleError = (response: Response): Promise<string> => response.json()
  .then((obj) => obj.message)
  .catch(() => response.text()
    .then((obj) => obj)
    .catch(() => 'failed for unknown reason'));
