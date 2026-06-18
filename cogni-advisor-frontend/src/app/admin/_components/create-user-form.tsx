"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  createUserSchema,
  type CreateUserValues,
} from "../_schema/create-user.schema";
import UserCard, { type CreatedUserCardData } from "./user-card";

type CreateUserFormProps = {
  title: string;
  description: string;
  submitLabel: string;
  successMessage: string;
  isPending: boolean;
  isSuccess: boolean;
  error: Error | null;
  createdUser: CreatedUserCardData | null;
  onSubmit: (values: CreateUserValues) => void;
  onCreateAnother: () => void;
};

const defaultValues: CreateUserValues = {
  first_name: "",
  middle_name: "",
  last_name: "",
  national_id: "",
  password: "",
  gender: "male",
  street_address: "",
};

export default function CreateUserForm({
  title,
  description,
  submitLabel,
  successMessage,
  isPending,
  isSuccess,
  error,
  createdUser,
  onSubmit,
  onCreateAnother,
}: CreateUserFormProps) {
  const form = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues,
  });

  const handleSubmit: SubmitHandler<CreateUserValues> = (values) => {
    onSubmit(values);
  };

  useEffect(() => {
    if (!isSuccess) {
      return;
    }

    toast.success(successMessage);
  }, [form, isSuccess, successMessage]);

  useEffect(() => {
    if (!error) {
      return;
    }

    toast.error(error.message);
  }, [error]);

  return (
    <section className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </header>

      <Form {...form}>
        <form className="space-y-5" onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ahmed" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="middle_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Middle Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Mohamed" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ali" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="national_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>National ID</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="29201019999999" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" placeholder="********" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="street_address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Street Address</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Street 12, Cairo" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error.message}
            </p>
          ) : null}

          <Button
            type="submit"
            variant="gradient"
            size="lg"
            disabled={isPending}
            className="h-12 w-full rounded-xl"
          >
            {isPending ? "Submitting..." : submitLabel}
          </Button>

          {createdUser ? (
            <div className="space-y-4 pt-2">
              <UserCard data={createdUser} />
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-xl"
                onClick={() => {
                  form.reset(defaultValues);
                  onCreateAnother();
                }}
              >
                Create Another
              </Button>
            </div>
          ) : null}
        </form>
      </Form>
    </section>
  );
}
