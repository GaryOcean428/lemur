```diff
--- a/src/components/AuthForm.tsx
+++ b/src/components/AuthForm.tsx
@@ -1,6 +1,7 @@
 import React, { useState } from 'react';
 import { useAuth } from '@/hooks/use-auth';
 import { Button } from '@/components/ui/button';
+import { Github } from 'lucide-react'; // Assuming lucide-react is installed and has a Github icon
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { useToast } from '@/hooks/use-toast';
@@ -9,7 +10,7 @@
   onSuccess?: () => void;
   onClose?: () => void;
 }
-
+ 
 export function AuthForm({ onSuccess, onClose }: AuthFormProps) {
   const { signUpWithEmailPassword, signInWithEmailPassword, isLoading, error: authHookError } = useAuth();
   const { toast } = useToast();
@@ -17,6 +18,7 @@
   const [password, setPassword] = useState('');
   const [isSignUp, setIsSignUp] = useState(false);
   const [formError, setFormError] = useState<string | null>(null);
+  const { signInWithGitHub } = useAuth(); // Add this line
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
@@ -39,6 +41,16 @@
     }
   };
 
+  const handleGitHubSignIn = async () => {
+    try {
+      await signInWithGitHub();
+      if (onSuccess) onSuccess();
+      if (onClose) onClose();
+    } catch (error: any) {
+      setFormError(error.message || 'Failed to sign in with GitHub.');
+      toast({ title: 'Error', description: error.message || 'Failed to sign in with GitHub.', variant: 'destructive' });
+    }
+  };
   return (
     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
       <div className="bg-background p-6 rounded-lg shadow-xl w-full max-w-md">
@@ -61,6 +73,10 @@
           {isLoading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
         </Button>
         <Button variant="outline" onClick={handleGitHubSignIn} className="w-full">
+          <Github className="mr-2 h-4 w-4" />
           Sign in with GitHub
         </Button>
         <Button variant="link" onClick={() => { setIsSignUp(!isSignUp); setFormError(null); }} className="w-full mt-4">
```
