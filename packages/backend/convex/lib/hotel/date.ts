export const getCurrentDate = () => new Date().toISOString().slice(0, 10);

export const isValidDateRange = (checkInDate: string, checkOutDate: string) => {
  const isoDate = /^\d{4}-\d{2}-\d{2}$/;

  return (
    isoDate.test(checkInDate) &&
    isoDate.test(checkOutDate) &&
    checkOutDate > checkInDate
  );
};
