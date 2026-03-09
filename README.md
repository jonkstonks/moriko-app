# moriko-app
**deploy grupitöö | KTA-25**

### Grupp
Johanna Okas (GitHub admin)\
Mona-Marii Kokk (Server admin)\
Elizabeth Mõistlik (QA/QC, tester) 

### Info
**Domain host:** name.com\
**Security:** Cloudflare\
**Deployment:** Oracle Cloud\
_Image: Ubuntu 24.04_\
_VM Instance: morikoapp 79.76.56.171_\
_VCN: moriko_cloud_

**E-mail:** Gmail -> Cloudflare -> sendgrid\
**Veebileht:** moriko.app

### Töökulg

Esimene päev kulus oma projekti kontseptsiooni, selle ülesehituse planeerimise, serverite seadistamise ning teemaga lähemalt tutvumise peale. Tegime muudatusi varasemas e-maili seadistuses ning saame nüüd seda koos kasutada. 

Veebilehe ülesehitus pole veel kivisse raiutud, kuid tahaks proovida Django frameworki.

### Kuidas deploy töötab

Oota, varsti jõuan selleni. Rahu!


### Esinenud probleemid ja lahendused


<details>
<summary>Ei saanud teisest arvutist serverile ligi</summary>

    Laptopi terminalist ei saanud serverile ligi ning probleem oli selles, et ssh võtmel olid valed õigused peal.\
    Algselt said faili õigused muudetud commandiga chmod 400, kuid ikka tuli serveritelt veateade: "Permission denied (publickey)."\
    Hiljem sai proovitud chmod 600, see lahendas probleemi ja serverile sai laptoist ligi.
    
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
