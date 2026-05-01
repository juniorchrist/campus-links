const prisma = require('../utils/prisma');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');

const register = async (req, res) => {
  try {
    const { email, password, firstname, lastname, className } = req.body;
    const normalizedEmail = email.toLowerCase();

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé.' });
    }

    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        firstname,
        lastname,
        className,
        role: 'STUDENT'
      }
    });

    // 1. Join Class Room
    if (className) {
        let classRoom = await prisma.room.findFirst({ where: { name: className } });
        if (!classRoom) {
            const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
            classRoom = await prisma.room.create({
                data: { name: className, description: `Salle de cours pour ${className}`, createdById: admin.id }
            });
        }
        await prisma.roomMember.create({ data: { userId: user.id, roomId: classRoom.id } });
    }

    const token = generateToken(user);
    res.status(201).json({ user: { id: user.id, email: user.email, firstname: user.firstname, lastname: user.lastname, role: user.role, className: user.className }, token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'inscription.' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || !(await comparePassword(password, user.password))) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }

    const token = generateToken(user);
    console.log(`Login successful for: ${user.email} (Role: ${user.role})`);
    res.json({ 
      user: { 
        id: user.id, 
        email: user.email, 
        firstname: user.firstname, 
        lastname: user.lastname, 
        role: user.role, 
        className: user.className,
        avatar: user.avatar
      }, 
      token 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erreur lors de la connexion.' });
  }
};

const me = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, firstname: true, lastname: true, role: true, avatar: true, className: true }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération du profil.' });
  }
};

module.exports = {
  register,
  login,
  me
};
