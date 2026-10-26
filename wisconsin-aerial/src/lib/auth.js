import { supabase } from "./supabaseClient";

export async function signInOperator(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOutOperator() {
  await supabase.auth.signOut();
}

export async function getOperatorSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onOperatorAuthChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}
