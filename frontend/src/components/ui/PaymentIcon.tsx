import { ID_METODO_TARJETA, ID_METODO_EFECTIVO } from "@backend/types";
import { CreditCardIcon } from "@phosphor-icons/react/dist/csr/CreditCard";
import { MoneyIcon } from "@phosphor-icons/react/dist/csr/Money";

export default function PaymentIcon ({paymentId, height} : { paymentId : number, height : number}) {
    switch (paymentId){
        case ID_METODO_TARJETA:
            return (
                <CreditCardIcon size={height}/>
            )
        case ID_METODO_EFECTIVO:
            return (
                <MoneyIcon size={height}/>
            )
    }
}