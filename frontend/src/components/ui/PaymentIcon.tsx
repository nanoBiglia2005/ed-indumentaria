import { ID_METODO_TARJETA, ID_METODO_EFECTIVO } from "@backend/types";
import { CreditCardIcon, MoneyIcon } from "@phosphor-icons/react";

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