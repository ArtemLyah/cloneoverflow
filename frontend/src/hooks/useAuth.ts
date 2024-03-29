import { useContext } from 'react';
import { AuthContext } from '../contexts/authContext';
import { AuthService } from '../api/services/auth.service';
import { AuthLoginDTO, AuthSignupDTO } from '@clone-overflow/common';

export const useAuth = () => {
  const { user, loading, setUser } = useContext(AuthContext);

  const login = async (data: AuthLoginDTO) => {
    const user = await AuthService.login(data);
    setUser(user);
    return user;
  }

  const singup = async (data: AuthSignupDTO) => {
    const user = await AuthService.signup(data);
    setUser(user);
    return user;
  }

  const refresh = async () => {
    return await AuthService.refreshToken();
  }

  return {
    user,
    loading,
    login,
    singup,
    refresh,
    setUser,
  };
}