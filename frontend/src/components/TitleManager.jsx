import { useEffect } from 'react';
import { useLocation } from 'react-router';

const TITLES = {
  '/': 'Home',
  '/circles': 'My Circles',
  '/circles/new': 'New circle',
  '/join': 'Join a circle',
  '/trust': 'Trust score',
  '/login': 'Log in',
  '/register': 'Create account',
};

export default function TitleManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const page = TITLES[pathname] || (pathname.startsWith('/circles/') ? 'Circle' : 'Page not found');
    document.title = `${page} · Gameya Manager`;
  }, [pathname]);

  return null;
}