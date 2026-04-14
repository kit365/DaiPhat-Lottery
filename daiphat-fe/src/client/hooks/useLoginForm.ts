import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { loginSchema, LoginFormValues } from "../types/auth.schema";
import { useClientLogin } from "./useClientAuth";

export const useLoginForm = () => {
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useClientLogin();

  const submit = form.handleSubmit((values) => {
    loginMutation.mutate(values);
  });

  return { form, submit, isPending: loginMutation.isPending };
};
