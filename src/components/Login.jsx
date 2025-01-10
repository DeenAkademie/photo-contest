import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from './ui/card';
import { useToast } from './ui/use-toast';

function Login({ supabase }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      navigate('/admin');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Login fehlgeschlagen',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-background px-4'>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
          <CardDescription>
            Melden Sie sich an, um auf den Admin-Bereich zuzugreifen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='email'>Email</Label>
              <Input
                id='email'
                type='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='password'>Passwort</Label>
              <Input
                id='password'
                type='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type='submit' className='w-full' disabled={loading}>
              {loading ? 'Wird angemeldet...' : 'Anmelden'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default Login;
