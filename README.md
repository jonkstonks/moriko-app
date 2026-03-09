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

Laptopi terminalist ei saanud serverile ligi ning probleem oli selles, et ssh võtmel olid valed õigused peal.\
Algselt said faili õigused muudetud commandiga chmod 400, kuid ikka tuli serveritelt veateade: "Permission denied (publickey)."\
Hiljem sai proovitud chmod 600, see lahendas probleemi ja serverile sai laptopist ligi.
