const User = require('../models/User');

module.exports = async function createAdmin() {
  try {
    const adminEmail = 'admini@admini.com';
    const exists = await User.findOne({ email: adminEmail });

    if (!exists) {
      const user = new User({
        email: adminEmail,
        password: 'admin1234', // en clair
        firstName: 'Admin',
        lastName: 'User',
        language: 'en',
        role: 'Admin'
      });

      await user.save(); //  déclenche bien le hook de hashage
      console.log(' Admin user created!');
    } else {
      console.log(' Admin already exists');
    }
  } catch (err) {
    console.error(' Failed to create admin:', err.message);
  }
};
