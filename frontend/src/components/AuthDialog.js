import React, { useState, useContext } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { AuthContext } from '../App';

export const AuthDialog = ({ open, onClose }) => {
  const { login, register } = useContext(AuthContext);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ email: '', username: '', password: '' });

  const handleLogin = async (e) => {
    e.preventDefault();
    const success = await login(loginData.email, loginData.password);
    if (success) onClose();
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const success = await register(registerData.email, registerData.username, registerData.password);
    if (success) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glassmorphism border-primary/20" data-testid="auth-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading text-3xl text-primary">Tervetuloa</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="login" className="mt-4">
          <TabsList className="grid w-full grid-cols-2" data-testid="auth-tabs">
            <TabsTrigger value="login" data-testid="login-tab">Kirjaudu</TabsTrigger>
            <TabsTrigger value="register" data-testid="register-tab">Rekisteröidy</TabsTrigger>
          </TabsList>
          <TabsContent value="login" data-testid="login-form">
            <form onSubmit={handleLogin} className="space-y-6 mt-6">
              <div>
                <Label htmlFor="login-email">Sähköposti</Label>
                <Input
                  id="login-email"
                  data-testid="login-email-input"
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  className="mt-2"
                  required
                />
              </div>
              <div>
                <Label htmlFor="login-password">Salasana</Label>
                <Input
                  id="login-password"
                  data-testid="login-password-input"
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  className="mt-2"
                  required
                />
              </div>
              <Button type="submit" className="w-full neon-glow" data-testid="login-submit-button">
                KIRJAUDU SISÄÄN
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="register" data-testid="register-form">
            <form onSubmit={handleRegister} className="space-y-6 mt-6">
              <div>
                <Label htmlFor="register-email">Sähköposti</Label>
                <Input
                  id="register-email"
                  data-testid="register-email-input"
                  type="email"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  className="mt-2"
                  required
                />
              </div>
              <div>
                <Label htmlFor="register-username">Käyttäjänimi</Label>
                <Input
                  id="register-username"
                  data-testid="register-username-input"
                  type="text"
                  value={registerData.username}
                  onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                  className="mt-2"
                  required
                />
              </div>
              <div>
                <Label htmlFor="register-password">Salasana</Label>
                <Input
                  id="register-password"
                  data-testid="register-password-input"
                  type="password"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  className="mt-2"
                  required
                />
              </div>
              <Button type="submit" className="w-full neon-glow" data-testid="register-submit-button">
                REKISTERÖIDY
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};