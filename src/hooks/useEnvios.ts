
// This will be appended to the file - I'm adding code for the success message
// Look for the success case in the sendEmail function:

// Success case
console.log('Email enviado com sucesso:', functionData);

toast({
  title: "Sucesso",
  description: `Email enviado com sucesso para ${contatoData.nome}! Um recebimento automático será enviado ao destinatário.`,
  duration: 5000
});

setSending(false);
fetchEnvios();
return true;
