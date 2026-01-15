// Quick test to see what error the admin route is throwing
async function testAdminRoute() {
  try {
    const response = await fetch('http://localhost:3000/api/admin?key=saiisadmin');
    console.log('Status:', response.status);
    console.log('OK:', response.ok);
    
    const text = await response.text();
    console.log('Response text:', text);
    
    if (!response.ok) {
      console.error('Failed with status', response.status);
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testAdminRoute();
