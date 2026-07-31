import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'

import { changePasswordSchema, type ChangePasswordFormValues } from '../schemas/auth.schemas'
import { authApi } from '../api/auth.api'
import { useAuthSessionStore } from '../stores/auth-session.store'
import { ApiRequestError } from '@/lib/apiError'
import { queryClient } from '@/lib/queryClient'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function ChangePasswordDialog({ children }: { children?: React.ReactElement }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const clearSession = useAuthSessionStore((s) => s.clearSession)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
  })

  const mutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: ChangePasswordFormValues) =>
      authApi.changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      reset()
      setOpen(false)
      clearSession()
      queryClient.clear()
      navigate('/login', { replace: true })
    },
  })

  const onSubmit = (values: ChangePasswordFormValues) => mutation.mutate(values)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children || <Button variant="outline">Change Password</Button>} />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            Enter your current password and choose a new one. You will be logged out upon success.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              type="password"
              {...register('currentPassword')}
              placeholder="Enter current password"
            />
            {errors.currentPassword && (
              <p className="text-sm text-destructive">{errors.currentPassword.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              {...register('newPassword')}
              placeholder="Enter new password"
            />
            {errors.newPassword && (
              <p className="text-sm text-destructive">{errors.newPassword.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              type="password"
              {...register('confirmPassword')}
              placeholder="Confirm new password"
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>
          {mutation.isError && (
            <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-md border border-destructive/20">
              {mutation.error instanceof ApiRequestError
                ? mutation.error.message
                : 'An unexpected error occurred. Please try again.'}
            </div>
          )}
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mutation.isPending ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
