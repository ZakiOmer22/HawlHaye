export type AuthStackParams = {
  Login: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token?: string } | undefined;
  AcceptInvite: { token?: string } | undefined;
};
export type MainStackParams = {
  Board: undefined;
  MyTasks: undefined;
  Delegations: undefined;
  Review: undefined;
  Dashboard: undefined;
  Profile: undefined;
  TaskDetail: { id: string };
  CreateTask: undefined;
  Search: undefined;
  Security: undefined;
  ChangePassword: undefined;
  Tickets: undefined;
  TicketDetail: { id: string };
  Users: undefined;
  Audit: undefined;
};
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends MainStackParams, AuthStackParams {}
  }
}
