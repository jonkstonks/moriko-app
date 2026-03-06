# moriko-app
**deploy grupitöö | KTA-25**

**Meeskond:** Johanna Okas (GitHub admin), Mona-Marii Kokk (Server admin), Elizabeth Mõistlik (QA/QC, tester) 

### Info
**Domain host:** name.com\
**Security:** Cloudflare\
**Deployment:** Oracle Cloud\
_Image: Ubuntu 24.04_ 
_VM Instance: morikoapp 79.76.56.171_\ 
_VCN: moriko_cloud_

**E-mail:** Gmail -> Cloudflare -> sendgrid
**Veebileht:** moriko.app

### Töökulg

Esimene päev kulus oma projekti ülesehituse planeerimise, serverite seadistamise ning teemaga lähemalt tutvumise peale. Tegime muudatusi varasemas e-maili seadistuses ning saame nüüd seda koos kasutada. 

Veebilehe ülesehitus pole veel kivisse raiutud, kuid tahaks proovida kasutada Django'

### Kuidas deploy töötab

Oota, varsti jõuan selleni. Rahu!


### Esinenud probleemid ja lahendused


<details>
<summary>~</summary>
</details>

<details>
<summary>~</summary>
</details>

<details>
<summary>E-maili seadistus</summary>

Internet\
    ↓\
Cloudflare MX\
   ↓\
Cloudflare Email Routing\
   ↓\
Gmail Inbox\
   ↓\
Gmail → SendGrid SMTP\
   ↓\
Recipient inbox

*Cloudflare → receives mail*\
*Gmail → reads mail*\
*SendGrid → sends mail with proper authentication*


**Tekkis probleem:** Meilile vastates jõudis saajale kiri @gmail.com aadressilt, mitte @moriko.app-ilt

Seadistused said üle kontrollitud, testisime uuesti ja sama viga enam ei esinenud. 
</details>