exports.handler = async (event) => {
  if(event.httpMethod !== 'POST') return {statusCode:405,body:'Method not allowed'};
  
  const {email, password} = JSON.parse(event.body||'{}');
  if(!email||!password) return {statusCode:400,body:JSON.stringify({error:'Email y contraseña requeridos'})};

  const SB_URL = 'https://gltqhcnusblfovhxljcs.supabase.co';
  const SR_KEY = process.env.SUPABASE_SERVICE_KEY;

  const resp = await fetch(SB_URL+'/auth/v1/admin/users', {
    method: 'POST',
    headers: {
      'apikey': SR_KEY,
      'Authorization': 'Bearer '+SR_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({email, password, email_confirm: true})
  });

  const data = await resp.json();
  if(!resp.ok) return {statusCode:400,body:JSON.stringify({error:data.msg||data.message||'Error al crear usuario'})};
  
  return {
    statusCode:200,
    headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'},
    body:JSON.stringify({id:data.id, email:data.email})
  };
};
