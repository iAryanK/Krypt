/* eslint-disable react/prop-types */
import { createContext, useEffect, useState } from "react";
import { ethers } from "ethers";
import { contractABI, contractAddress } from "../config/constants";

// eslint-disable-next-line react-refresh/only-export-components
export const TransactionContext = createContext();

const { ethereum } = window;

const getEthereumContract = () => {
    const provider = new ethers.providers.Web3Provider(ethereum);
    const signer = provider.getSigner();
    const transactionContract = new ethers.Contract(contractAddress, contractABI, signer);

    return transactionContract;
}

export const TransactionProvider = ({ children }) => {
    const [currentAccount, setCurrentAccount] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [transactionCount, setTransactionCount] = useState(localStorage.getItem("transactionCount") || 0);
    const [transactions, setTransactions] = useState([]);
    const [formData, setFormData] = useState({
        addressTo: "",
        amount: "",
        message: "",
        keyword: "",
    });

    const handleChange = (e, name) => {
        const { value } = e.target;

        setFormData({
            ...formData,
            [name]: value
        });
    }

    const getAllTransactions = async () => {
        try {
            if (!ethereum) return alert("Make sure you have metamask!");

            const transactionContract = getEthereumContract();

            const availableTransactions = await transactionContract.getAllTransactions();


            const structuredTransactions = availableTransactions.map(transaction => ({
                addressTo: transaction.receiver,
                addressFrom: transaction.sender,
                timestamp: new Date(transaction.timestamp.toNumber() * 1000).toLocaleString(),
                message: transaction.message,
                keyword: transaction.keyword,
                amount: parseInt(transaction.amount._hex) / (10 ** 18),
            }));

            setTransactions(structuredTransactions);

        } catch (error) {
            console.log(error);
            throw new Error("no ethereum object");
        }
    }

    const checkIfWalletIsConnected = async () => {
        try {
            if (!ethereum)
                return console.log("Make sure you have metamask!");

            const accounts = await ethereum.request({ method: 'eth_accounts' });

            if (accounts.length) {
                setCurrentAccount(accounts[0]);

                getAllTransactions();
            } else {
                console.log("No authorized account found");
            }

            console.log(accounts);
        } catch (error) {
            console.log(error);
            throw new Error("no ethereum object");
        }
    }

    const checkIfTransactionExist = async () => {
        try {
            const transactionContract = getEthereumContract();

            const transactionCount = await transactionContract.getTransactionCount();

            window.localStorage.setItem("transactionCount", transactionCount.toNumber());
        } catch (error) {
            console.log(error);
            throw new Error("no ethereum object");
        }
    }

    const connectWallet = async () => {
        try {
            if (!ethereum)
                return console.log("Make sure you have metamask!");

            const accounts = await ethereum.request({ method: 'eth_requestAccounts' });

            setCurrentAccount(accounts[0]);
        } catch (error) {
            console.log(error);
            throw new Error("no ethereum object");
        }
    }

    const sendTransaction = async (transaction) => {
        try {
            if (!ethereum)
                return console.log("Make sure you have metamask!");

            const { addressTo, amount, keyword, message } = formData;

            const transactionContract = getEthereumContract();
            const parsedAmount = ethers.utils.parseEther(amount);

            await ethereum.request({
                method: 'eth_sendTransaction',
                params: [{
                    to: addressTo,
                    from: currentAccount,
                    value: parsedAmount._hex,
                    gas: '0x5208',
                }]
            });

            const transactionHash = await transactionContract.addToBlockchain(
                addressTo,
                parsedAmount,
                keyword,
                message
            );

            setIsLoading(true);
            console.log(`Loading - ${transactionHash}`);
            await transactionHash.wait();
            setIsLoading(false);
            console.log(`Success - ${transactionHash}`);

            const transactionCount = await transactionContract.getTransactionCount();

            setTransactionCount(transactionCount.toNumber());

        } catch (error) {
            console.log(error);

        }
    }

    useEffect(() => {
        checkIfWalletIsConnected();
        checkIfTransactionExist();
    }, []);

    return (
        <TransactionContext.Provider value={{ connectWallet, currentAccount, handleChange, formData, setFormData, sendTransaction, transactions, isLoading }}>
            {children}
        </TransactionContext.Provider>
    )
};