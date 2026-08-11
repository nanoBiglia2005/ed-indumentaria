import { ExpressAuth, getSession } from '@auth/express';
import Google from '@auth/express/providers/google';
import prisma from './db.js';

const findUsuarioByEmail = (email) =>
  prisma.USUARIOS.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });

const authConfig = {
  providers: [Google],
  session: { strategy: 'jwt' },
  pages: { signIn: '/', error: '/' },
  callbacks: {
    async signIn({ profile }) {
      if (!profile?.email) return false;
      const usuario = await findUsuarioByEmail(profile.email);
      return Boolean(usuario);
    },
    async jwt({ token, account, profile }) {
      if (account && profile?.email) {
        const usuario = await findUsuarioByEmail(profile.email);
        if (usuario) {
          token.id_usuario = usuario.id_usuario;
          token.nombre = usuario.nombre;
          token.apellido = usuario.apellido;
          token.rol = usuario.rol;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id_usuario = token.id_usuario;
      session.user.nombre = token.nombre;
      session.user.apellido = token.apellido;
      session.user.rol = token.rol;
      return session;
    },
  },
};

export const authHandler = ExpressAuth(authConfig);

export async function requireAuth(req, res, next) {
  const session = await getSession(req, authConfig);
  if (!session?.user) {
    return res.status(401).json({ message: 'No autenticado.' });
  }
  res.locals.session = session;
  next();
}
