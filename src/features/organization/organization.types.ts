export type Department = {
  id: string;
  code: string;
  name: string;
  description?: string;
  employeeCount: number;
  positionCount: number;
};

export type Position = {
  id: string;
  code: string;
  name: string;
  departmentId?: string;
  departmentName?: string;
  employeeCount: number;
};
