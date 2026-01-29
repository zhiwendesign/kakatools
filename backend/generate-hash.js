const bcrypt = require('bcrypt');

async function generatePasswordHash() {
  const password = 'zhiwen@987';
  const hash = await bcrypt.hash(password, 10);
  console.log(`密码: ${password}`);
  console.log(`哈希值: ${hash}`);
  return hash;
}

generatePasswordHash();