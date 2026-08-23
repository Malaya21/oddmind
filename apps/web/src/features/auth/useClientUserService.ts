"use client";

import { useMemo } from "react";
import { UserServiceImpl } from "@/services/UserService";
import { createFirestoreClientUserRepository } from "@/infrastructure/firebase/firestore/FirestoreClientUserRepository";

let clientUserService: UserServiceImpl | undefined;

export function getClientUserService(): UserServiceImpl {
  if (!clientUserService) {
    clientUserService = new UserServiceImpl(createFirestoreClientUserRepository());
  }
  return clientUserService;
}

export function useClientUserService(): UserServiceImpl {
  return useMemo(() => getClientUserService(), []);
}
