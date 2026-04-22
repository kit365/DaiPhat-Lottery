import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { registerSchema, RegisterFormValues } from "../types/auth.schema";
import { useClientRegister } from "./useAuth";

export const useRegisterForm = () => {
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      agreedToTerms: false,
    },
  });

  const registerMutation = useClientRegister();

  const submit = form.handleSubmit(({ confirmPassword, ...payload }) => {
    void confirmPassword;
    registerMutation.mutate(payload);
  });

  return { form, submit, isPending: registerMutation.isPending };
};
