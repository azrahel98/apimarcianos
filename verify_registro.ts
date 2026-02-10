async function testRegistro() {
  const url = 'http://localhost:8080/registro';
  const uniqueEmail = `test_${Date.now()}@example.com`;

  const data = {
    nombre: 'Test User',
    email: uniqueEmail,
    contrasena: 'password123',
  };

  console.log(`Testing registration with email: ${uniqueEmail}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    console.log(`Status: ${response.status}`);
    const result = await response.json();
    console.log('Result:', result);

    if (response.status === 201) {
      console.log('✅ Registration Successful');
    } else {
      console.log('❌ Registration Failed');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testRegistro();
